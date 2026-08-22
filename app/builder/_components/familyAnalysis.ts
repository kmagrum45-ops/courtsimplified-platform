/**
 * Pure mapping from the Family canonical route result to the builder's
 * AnalysisResult. Kept out of FamilyIntake.tsx so it can be exercised
 * directly: importing the component pulls in the Supabase client, which
 * constructs at module load and throws without environment variables.
 */

import type { FamilyCanonicalIntakeResult } from "@/src/lib/case-system/orchestration/familyIntakeCanonicalAdapter";

import { type AnalysisResult, cleanList, getStageLabel } from "./builderTypes";
export function buildFamilyAnalysis(
  narrative: string,
  result: FamilyCanonicalIntakeResult,
): AnalysisResult {
  const family = result.familyMasterResult;
  const intelligence = result.brain.intelligence;

  // The overview panel picks the "What to confirm next" question by scanning
  // analysis.missingInformation and analysis.nextBestActions for a string
  // ending in "?", and falls back to a hardcoded placeholder when neither has
  // one. Family previously supplied only familyMasterResult.normalized
  // statements and never set nextBestActions at all, so the placeholder
  // always won even though the engine had generated real questions.
  //
  // Only genuine questions are carried across. Entries that are not questions
  // are left out because they read as internal instructions to a user
  // ("Review the story with the AI reasoning layer connected."), and
  // intelligence.nextBestActions is deliberately not used at all: its first
  // entry is "Confirm OpenAI configuration and rerun the analysis.", which
  // the three-area contract treats as prohibited user-facing language.
  const isQuestion = (value: string) => value.trim().endsWith("?");

  const proceduralQuestions = cleanList(
    intelligence.proceduralPosture?.nextProceduralQuestions || [],
  ).filter(isQuestion);

  const engineQuestions = cleanList(
    (intelligence.missingInformation || []).map((item) => item.question || ""),
  ).filter(isQuestion);

  const generatedQuestions = cleanList([
    ...proceduralQuestions,
    ...engineQuestions,
  ]);

  return {
    courtPath: "family",
    caseStage: getStageLabel(result.stage),
    completedForms: family.documentsPage.completedFormLabels,
    receivedForms: family.documentsPage.receivedFormLabels,
    requiredNextForms: cleanList([
      ...family.documentsPage.requiredFormLabels,
      ...family.documentsPage.recommendedFormLabels,
    ]),
    notNeededNow: family.documentsPage.notNeededNowLabels,
    detectedIssues: family.chatContext.detectedIssues,
    inferredFacts: [],
    missingInformation: cleanList([
      ...family.normalized.missingInformation,
      ...generatedQuestions,
    ]),
    risksAndGaps: family.builderSummary.blockers,
    guidance: family.builderSummary.nextBestActions,
    summary: family.builderSummary.judgeReadySummary || narrative,
    proceduralRisks: family.builderSummary.warnings,
    damagesIssues: [],
    defenceAttacks: [],
    judgeConcerns: [],
    suggestedFocus: family.builderSummary.nextBestActions,
    documentUploadRequests: family.evidencePage.uploadRequests,
    detectedFamilyIssues: family.chatContext.detectedIssues,
    recommendedEvidence: cleanList([
      ...family.evidencePage.strongestEvidenceTitles,
      ...family.evidencePage.uploadRequests,
    ]),
    recommendedFamilyNextSteps: family.builderSummary.nextBestActions,
    intelligence: result.brain.intelligence,
    intelligenceSummary: result.brain.intelligence.plainLanguageSummary,
    structuredIntelligenceSummary:
      result.brain.intelligence.structuredCaseSummary,
    intelligenceWarnings: result.brain.intelligence.systemWarnings,
    nextBestActions: generatedQuestions,
    intelligenceNextActions: result.brain.intelligence.nextBestActions,
  };
}
