/**
 * Splits long general-information text into a short lead and the remainder,
 * at a sentence boundary, so a card shows a readable summary with the rest
 * one click away. Nothing is removed or reworded: lead + rest is the original
 * text.
 *
 * WHY (live run, 2026-09-28). One "common defence" entry ran to about 230
 * words of time-counting detail, on a screen for someone who had not yet
 * filed anything.
 */
export function splitLead(text: string, maxLeadChars = 260): { lead: string; rest: string } {
  const trimmed = text.trim();
  if (trimmed.length <= maxLeadChars) return { lead: trimmed, rest: "" };

  const sentenceEnd = /[.?!](?=\s)/g;
  let cut = -1;
  let match: RegExpExecArray | null;
  while ((match = sentenceEnd.exec(trimmed)) !== null) {
    const end = match.index + 1;
    // Always keep at least the first sentence, even when it alone is longer
    // than the target; after that, stop before passing the target.
    if (cut > 0 && end > maxLeadChars) break;
    cut = end;
    if (end > maxLeadChars) break;
  }
  if (cut <= 0 || cut >= trimmed.length) return { lead: trimmed, rest: "" };
  return { lead: trimmed.slice(0, cut), rest: trimmed.slice(cut).trim() };
}
