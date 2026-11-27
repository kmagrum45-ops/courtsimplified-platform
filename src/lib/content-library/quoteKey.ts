/**
 * The key a published verdict's quote is filed under in
 * published/quotePinpoints.generated.json (2026-10-29, "exact words" step 1).
 *
 * The generated file holds, for each checked quote, the provision each of its
 * parts sits in. Keying it by the quote itself would copy every quote a second
 * time into the bundle, so it is keyed by a short hash of the source id and the
 * quote. The builder (scripts/content/buildVerdictSources.ts) refuses to write
 * the file if two different quotes ever hash alike, so a key names one quote.
 */

/** FNV-1a, 32 bits, as 8 hex digits: deterministic, no dependency, same in the browser and in node. */
export function quoteKey(sourceId: string, quote: string): string {
  const text = `${sourceId}\u0000${quote}`;
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

/** The parts a verdict's quote joins with " | " (each a separate passage of the same source). */
export function quoteParts(quote: string): string[] {
  return quote.split(" | ");
}
