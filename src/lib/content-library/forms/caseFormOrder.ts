/**
 * The order of the official forms catalogue on a case's Forms tab
 * (walkthrough 2026-10-14, SW: a Toronto sidewalk-fall plaintiff who had
 * filed nothing saw "Form 1A -- Notice of Objection to Proposed Method of
 * Attendance" and the rule 2.1 dismissal forms first, because the catalogue
 * was in form-number order and nothing about the case moved anything up).
 *
 * The forms the person's step takes, and the form that starts the court case
 * after a notice step, lead, in the order given; every other form follows in
 * its existing order. Nothing is removed: the catalogue stays the whole
 * catalogue, only its order changes.
 */

/** "Form 14A", "14a", " 14A " -> "14a"; family "13.1" stays "13.1". */
export function formKey(number: string): string {
  return number.replace(/^\s*form\s*/i, "").replace(/\s+/g, "").toLowerCase();
}

/** The items with those whose number is in `lead` first (in `lead`'s order), the rest after in their own order. */
export function leadFormsFirst<T>(items: readonly T[], numberOf: (item: T) => string, lead: readonly string[]): T[] {
  const rank = new Map<string, number>();
  lead.forEach((number, index) => {
    const key = formKey(number);
    if (!rank.has(key)) rank.set(key, index);
  });
  if (rank.size === 0) return [...items];
  return items
    .map((item, index) => ({ item, index, rank: rank.get(formKey(numberOf(item))) }))
    .sort((a, b) => {
      if (a.rank !== undefined && b.rank !== undefined) return a.rank - b.rank || a.index - b.index;
      if (a.rank !== undefined) return -1;
      if (b.rank !== undefined) return 1;
      return a.index - b.index;
    })
    .map((entry) => entry.item);
}

/**
 * What the Forms tab says about matching forms to the case (walkthrough run
 * 38525903567, SJ: an enforcement case read "We could not match forms to
 * where your case is" while the catalogue below marked nine forms "For your
 * step"). When the step's own forms are recorded, the note says so and points
 * to them; the "no routing rules" note and the "could not match" help line
 * are for a case with none. Never says no form applies.
 */
export type StageSupportNote = { note: string; help: string | null };
export function formsStageNote(
  stageSupport: { supported: boolean; reason?: string; stage?: string } | null,
  leadCount: number,
): StageSupportNote | null {
  if (!stageSupport || stageSupport.supported) return null;
  if (leadCount > 0) {
    return {
      note:
        `The forms your next step takes are listed first below, marked as for your step (${leadCount}). ` +
        "The questions further down match forms only when you are starting a case or responding to one, and every official form is listed for you to browse.",
      help: null,
    };
  }
  return {
    note:
      stageSupport.reason === "no-stage-supplied"
        ? "No stage is recorded for this case yet, so no form-routing rules have been checked. Recording where the case is up to in Intake will let this list be checked."
        : `No form-routing rules cover the "${stageSupport.stage}" stage yet. That is a gap in our routing data, not a finding that no forms apply to you — the full official catalogue below is still available to browse.`,
    help: "We could not match forms to where your case is, so these services can help you choose.",
  };
}
