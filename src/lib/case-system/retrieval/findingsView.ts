/**
 * What a reader is shown from a research run: each question, and the
 * provisions that answer it -- the provision's own words and the quote that
 * code found in it. Shared by the analysis ("What we looked into") and the
 * Court Assistant ("The law on your question"), so both show research the
 * same way.
 */

import type { ResearchFindingView } from "../intelligence/intelligenceTypes";
import type { ResearchResult } from "./researchStory";
import { passageItem } from "./storyRetrieval";

export function findingsView(research: ResearchResult, explainable: boolean): ResearchFindingView[] {
  return research.findings.map((finding) => ({
    question: finding.question,
    status: finding.status,
    ...(finding.missingSource ? { missingSource: finding.missingSource } : {}),
    provisions: finding.answeredBy
      .map((answer) => {
        const passage = research.passages.find((candidate) => candidate.id === answer.passageId);
        if (!passage) return null;
        const { id, label, citation, text, sourceUrl, kind } = passageItem(passage);
        return {
          id,
          label,
          text,
          sourceUrl,
          quote: answer.quote,
          ...(citation ? { citation } : {}),
          ...(kind ? { kind } : {}),
          ...(explainable ? { explainable } : {}),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null),
  }));
}
