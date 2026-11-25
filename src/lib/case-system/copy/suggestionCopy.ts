/**
 * THE THREE CHOICES EVERY OFFER IS MADE WITH (site owner, 11 Nov 2026: "Yes / No, that's not right / I'm not sure";
 * 14 Nov 2026, Chrome check of #550, 2.4 and 8.3: every offer anywhere, from ONE shared component, and "Use the
 * suggestion" is no longer a label).
 *
 * A suggestion read from the person's story, or made by the site, is OFFERED, never pre-ticked, pre-selected or
 * pre-filled, in all three courts. Everywhere it is offered with the same control (app/_components/UseSuggestion.tsx),
 * which reads its words from here, so no screen words its own. What is offered is shown beside the choices; "Yes" uses
 * it; nothing is saved until the person chooses (CLAUDE.md s. 4: suggest, never decide).
 *
 * scripts/verification/verifySuggestionsOffered.ts checks every suggestion place uses it.
 *
 * Plain words. States no law.
 */
export const OFFER_CHOICES = { yes: "Yes", no: "No, that's not right", unsure: "I'm not sure" } as const;

/** The Yes control's accessible name: "Yes: <what is offered>", or "Yes" when nothing more is shown. */
export function suggestionLabel(what?: string | null): string {
  const shown = (what ?? "").trim();
  return shown ? `${OFFER_CHOICES.yes}: ${shown}` : OFFER_CHOICES.yes;
}
