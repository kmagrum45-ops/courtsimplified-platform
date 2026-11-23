/**
 * Whether a quoted rule is word for word in its saved source (docs/sources/corpus), as test:stage-map checks it.
 *
 * Two allowances, and only these (owner's decision of 2026-11-23, for the approved Construction Act s. 39 (1) quote):
 * - A word the saved copy splits after its hyphen at a line break is read joined, hyphen kept ("twenty-\none" is
 *   "twenty-one"; SOURCING_NOTES records the same trap as "cross-\nexamine"). Only a hyphen at the END of a line, between
 *   two word characters, so no word is added, dropped or changed.
 * - One " …" at the very end marks that the provision goes on. The words before it are checked, and the saved text must
 *   really go on after them.
 * A " ... " inside a quote still splits it into runs checked one by one, so an ellipsis cannot stitch text together.
 * test:civil-lien-evidence-20261123 checks that a changed word, a stitched quote and a false "…" still fail.
 */

/** antiword pads words apart and hard-wraps. Compare on collapsed whitespace. */
export const flatText = (text: string): string => text.replace(/\s+/g, " ").trim();

export type SavedTextForms = { flat: string; joined: string };

export function savedTextForms(raw: string): SavedTextForms {
  return { flat: flatText(raw), joined: flatText(raw.replace(/(\w)-[ \t]*\r?\n[ \t]*(\w)/g, "$1-$2")) };
}

/** Each run of the quote checked, and the problems found ([] when the quote is word for word in the saved text). */
export function quoteProblems(quote: string, saved: SavedTextForms): { runs: number; problems: string[] } {
  const problems: string[] = [];
  const trailing = quote.endsWith(" …");
  const quoted = trailing ? quote.slice(0, -2) : quote;
  if (trailing) {
    const at = saved.joined.indexOf(flatText(quoted));
    if (at >= 0 && saved.joined.slice(at + flatText(quoted).length).trim().length === 0) {
      problems.push(`ends with "…" but the saved text does not go on after it`);
    }
  }
  const runs = quoted.split(" ... ");
  for (const run of runs) {
    if (!saved.flat.includes(flatText(run)) && !saved.joined.includes(flatText(run))) {
      problems.push(`quoted text is NOT in the vendored source.\n      looked for: ${flatText(run).slice(0, 120)}`);
    }
  }
  return { runs: runs.length, problems };
}
