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
// Legal/citation abbreviations that end in a period without ending a sentence
// ("Under s. 4(1) of the Act..."). Found live 2026-10-16: a defence whose only
// other sentence boundary came after the 260-char target truncated to
// "Under s." because the loop locked onto this period as the sentence end.
const ABBREVIATION_BEFORE_PERIOD =
  /^(s|ss|r|rr|v|c|cl|art|arts|no|para|paras|sec|secs|pt|sch|reg|regs|vol|ed|al|etc|dr|mr|mrs|ms|st)$/i;

function endsOnAbbreviation(text: string, periodIndex: number): boolean {
  let start = periodIndex;
  while (start > 0 && /[A-Za-z]/.test(text[start - 1])) start -= 1;
  const word = text.slice(start, periodIndex);
  return word.length > 0 && ABBREVIATION_BEFORE_PERIOD.test(word);
}

export function splitLead(text: string, maxLeadChars = 260): { lead: string; rest: string } {
  const trimmed = text.trim();
  if (trimmed.length <= maxLeadChars) return { lead: trimmed, rest: "" };

  const sentenceEnd = /[.?!](?=\s)/g;
  let cut = -1;
  let match: RegExpExecArray | null;
  while ((match = sentenceEnd.exec(trimmed)) !== null) {
    // "s.", "v.", "no." etc. end on a period but don't end the sentence --
    // skip them so the loop keeps looking for the real boundary. 2026-10-16
    // live bug: this read `text[match.index]`, but `match.index` is an
    // offset into `trimmed` (what sentenceEnd actually scans) -- any source
    // string with leading whitespace shifted every index by that much,
    // silently defeating the abbreviation check and locking the cut onto
    // the FIRST period ("Under s." for a dog-bite defence whose text begins
    // "Under s. 3 of Ontario's Negligence Act..."), well short of the real
    // sentence end past the 260-char budget.
    if (trimmed[match.index] === "." && endsOnAbbreviation(trimmed, match.index)) continue;
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
