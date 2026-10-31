/**
 * WHAT A SUGGESTION'S ONE-CLICK CONTROL SAYS (owner's Chrome check, 31 Oct).
 *
 * A suggestion read from the person's story, or made by the site, is OFFERED, never pre-ticked,
 * pre-selected or pre-filled, in all three courts (Small Claims, civil, Family). Everywhere it is
 * offered with the same one-click control (app/_components/UseSuggestion.tsx), which reads its
 * words from here, so no screen words its own ("Yes, that's right", "Use suggested", "Use “…” (from
 * your story)", "Save this answer" were five ways of saying one thing). The person uses it or
 * ignores it; ignoring it saves nothing (CLAUDE.md s. 4: suggest, never decide).
 *
 * scripts/verification/verifySuggestionsOffered.ts checks every suggestion place uses it.
 *
 * Plain words. States no law.
 */
export const USE_THE_SUGGESTION = "Use the suggestion";

/** The control's words: "Use the suggestion: <what it is>", or just "Use the suggestion" when it shows nothing more. */
export function suggestionLabel(what?: string | null): string {
  const shown = (what ?? "").trim();
  return shown ? `${USE_THE_SUGGESTION}: ${shown}` : USE_THE_SUGGESTION;
}
