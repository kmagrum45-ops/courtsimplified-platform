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
