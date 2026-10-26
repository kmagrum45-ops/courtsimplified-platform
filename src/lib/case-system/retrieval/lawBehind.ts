/**
 * "THE LAW BEHIND THIS": THE RULES THAT MATTER MOST FOR THE CLAIM, FIRST (Charter re-test 2026-10-26).
 *
 * The box showed only the law the research had not already shown, so on a Charter claim against
 * police it showed one complaints provision while Charter ss. 8, 9 and 10, the police board's
 * liability and Vancouver (City) v. Ward sat folded under "What we looked into". The box now leads
 * with the provisions the research found, in its order (the questions a careful lawyer would ask
 * first come first), one line each with the question it answers; their words stay in "What we
 * looked into", so nothing is quoted twice. Law the analysis rests on that the research did not
 * show follows, quoted as before.
 *
 * Pure.
 */
import type { AppliedLawItem, ResearchFindingView } from "../intelligence/intelligenceTypes";

export type LawLine = { id: string; name: string; sourceUrl: string; kind?: AppliedLawItem["kind"]; checkedOn?: string; answers: string };

const MAX_LINES = 8;

export function lawBehindThis(findings: readonly ResearchFindingView[] = [], appliedLaw: readonly AppliedLawItem[] = []): { lines: LawLine[]; quoted: AppliedLawItem[] } {
  const answered = findings.filter((finding) => finding.status === "answered" && finding.provisions.length > 0);
  const lines: LawLine[] = [];
  const add = (provision: AppliedLawItem, answers: string) => {
    if (lines.length >= MAX_LINES || lines.some((line) => line.id === provision.id)) return;
    lines.push({ id: provision.id, name: provision.citation || provision.label.replace(/^[A-Za-z ]+:\s*/, ""), sourceUrl: provision.sourceUrl, kind: provision.kind, checkedOn: provision.checkedOn, answers });
  };
  // Each question's first provision, then the rest: every question is represented before any repeats.
  for (const finding of answered) add(finding.provisions[0], finding.question);
  for (const finding of answered) for (const provision of finding.provisions.slice(1)) add(provision, finding.question);
  const shown = new Set(answered.flatMap((finding) => finding.provisions.map((provision) => provision.id)));
  return { lines, quoted: appliedLaw.filter((item) => !shown.has(item.id)) };
}
