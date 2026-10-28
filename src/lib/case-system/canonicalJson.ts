/**
 * ONE JSON TEXT FOR ONE VALUE, WHATEVER ORDER ITS KEYS CAME IN (Chrome, 28 Oct).
 *
 * The case is saved in Postgres as jsonb, which reorders every object's keys (shorter keys first).
 * A value read back from the database is therefore never in the order the page wrote it, so
 * comparing JSON.stringify of the two said "changed" when nothing had: the home reading's answers
 * came back as {answer, question}, the saved initial facts no longer matched the page's, and the
 * first Confirm bounced with "Your initial facts changed" (then "Show my next step" dropped the
 * confirmation). Every comparison of a stored value with the page's uses this.
 *
 * Pure: arrays keep their order (their order is meaning); only object keys are sorted.
 */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_key, item: unknown) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return item;
    return Object.fromEntries(Object.keys(item as Record<string, unknown>).sort().map((key) => [key, (item as Record<string, unknown>)[key]]));
  });
}
